$(document).ready(function() {

$('#inputExpiry').datepicker({
  format: "yyyy-mm-dd",
  todayHighlight: true,
  autoclose: true
});

$("#license").focus(function() {
  var self = $(this);
  self.select();

  // Work around Chrome's little problem
  self.mouseup(function() {
    // Prevent further mouseup intervention
    self.unbind("mouseup");
    return false;
  });
});

$('#inputButton').click(function() {
  $('#inputIdentifier,#inputName,#inputExpiry').parent().removeClass('has-error');

  var identifier = $('#inputIdentifier').val();
  if (!identifier) {
    $('#inputIdentifier').parent().addClass('has-error');
  }
  var name = $('#inputName').val();
  if (!name) {
    $('#inputName').parent().addClass('has-error');
  }
  var expiry = $('#inputExpiry').val();
  if (!expiry) {
    $('#inputExpiry').parent().addClass('has-error');
  }

  if (!expiry | !name | !identifier)
    return;

  $.post('/generate', {
    identifier: identifier,
    name: name,
    expiry: expiry
  }, function(result) {
    $('#license').val(result);
  });

});

});
