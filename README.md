License Generation Server
-------------------------

Before use, a licence key pair must be created:

```
openssl genrsa -out license-private-key.pem 2048
openssl rsa -in license-private-key.pem -outform PEM -pubout -out license-public-key.pem
```

The public key should then be used in the software. The private key must be
kept private.
