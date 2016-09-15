var express = require('express');
var passport = require('passport');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var util = require('util');
var router = express.Router();

var private_key =
    process.env.LICENSE_PRIVATE_KEY ||
    fs.readFileSync(path.join(__dirname, '..', 'license-private-key.pem'));


// GET home page.
router.get('/', ensureAuthenticated, function(req, res) {
  res.render('index', { title: 'License Generator' });
});


// GET /login
router.get('/login', function(req, res) {
  res.render('login');
});


// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callback
router.get('/auth/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'],
    hostedDomain: 'crate.io',
    failureFlash: true
  }),
  function(req, res) {
    res.redirect('/');
  }
);

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.post('/generate', ensureAuthenticated, function(req, res) {
  generateLicense(
    req.body.identifier, req.body.name, req.body.expiry,
    function(err, license) {
      if (err) {
        return res.send(err);
      }
      var email = (req.user && req.user.emails && req.user.emails[0]) || "unknown";
      console.log(util.format("%s generated license (%s) for \"%s\", expiring %s",
          email, req.body.identifier, req.body.name, req.body.expiry));
      return res.send(license);
    }
  );
});


function ensureAuthenticated(req, res, next) {
return next();
/*
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/google');
  */
}


function generateLicense(identifier, name, expiry, next) {
  var dateFields = /^(\d+)-(\d+)-(\d+)$/.exec(expiry);
  if (!dateFields)
    return "INVALID EXPIRY DATE: '" + expiry + "'";
  var year = parseInt(dateFields[1]);
  var month = parseInt(dateFields[2]);
  var day = parseInt(dateFields[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000)
    return "INVALID EXPIRY DATE: '" + expiry + "'";

  var today = new Date();

  var identifierBytes = new Buffer(identifier, 'utf8');
  var nameBytes = new Buffer(name, 'utf8');
  var issueBytes = packDate(
    today.getUTCFullYear(),
    today.getUTCMonth()+1,
    today.getUTCDate()
  );
  var expiryBytes = packDate(year, month, day);
  var nullByte = new Buffer(1);
  nullByte.writeUInt8(0, 0);

  var detailBytes = Buffer.concat([identifierBytes, nullByte, nameBytes, nullByte, issueBytes, expiryBytes]);

  var detailLength = new Buffer(2);
  detailLength.writeUInt16BE(detailBytes.length, 0);

  var signatureBytes = sign(detailBytes);

  var encodedKey = Buffer.concat([nullByte, detailLength, detailBytes, signatureBytes]).toString('base64');
  var license = util.format("----BEGIN COMMERCIAL LICENSE KEY %s----\n%s\n----END COMMERCIAL LICENSE KEY %s----\n",
    identifier,
    encodedKey.match(/.{1,76}/g).join("\n"),
    identifier);

  next(null, license);
}

function packDate(year, month, day) {
  var dayOfYear = getDOY(year, month, day);
  var packedDate = ( ( year & 0x7FFF ) << 9 ) | ( dayOfYear & 0x1FF );

  var dateBytes = new Buffer(3);
  dateBytes.writeUInt8(( packedDate >> 16 ) & 0xFF, 0);
  dateBytes.writeUInt8(( packedDate >> 8 ) & 0xFF, 1);
  dateBytes.writeUInt8(packedDate & 0xFF, 2);

  return dateBytes;
}

function getDOY(year, month, day) {
  var date = new Date(year, month-1, day);
  var onejan = new Date(year, 0, 1);
  return Math.ceil((date - onejan) / 86400000) + 1;
}

function sign(bytes) {
  var signer = crypto.createSign('RSA-SHA1');
  signer.update(bytes);
  return signer.sign(private_key);
}


module.exports = router;
