function classifyVerification({
  localStatus,
  localReference,
  incomingId,
  mappedStatus,
  bookingAlreadyPaid,
}) {
  const reference = String(localReference || '');
  const incoming = String(incomingId || '');
  const sameReference = Boolean(reference) && reference === incoming;
  const paidAlready = localStatus === 'PAID' || bookingAlreadyPaid === true;

  if (mappedStatus === 'PAID' && paidAlready && reference && reference !== incoming) {
    return { action: 'duplicate_charge', confirmBooking: false, manualInterventionRequired: true };
  }
  if (mappedStatus === 'PAID' && localStatus === 'PAID' && sameReference) {
    return { action: 'idempotent_paid', confirmBooking: false, manualInterventionRequired: false };
  }
  if (mappedStatus === 'PAID' && bookingAlreadyPaid && !sameReference) {
    return { action: 'duplicate_charge', confirmBooking: false, manualInterventionRequired: true };
  }
  if (paidAlready && mappedStatus !== 'PAID' && !(mappedStatus === 'REFUNDED' && sameReference)) {
    return { action: 'ignore_unpay', confirmBooking: false, manualInterventionRequired: false };
  }
  if (mappedStatus === 'REFUNDED' && sameReference) {
    return { action: 'mark_refunded', confirmBooking: false, manualInterventionRequired: false };
  }
  if (mappedStatus === 'PAID') {
    return { action: 'mark_paid', confirmBooking: true, manualInterventionRequired: false };
  }
  if (mappedStatus === 'FAILED' && localStatus === 'FAILED' && (sameReference || !reference || reference === incoming)) {
    return { action: 'idempotent_failed', confirmBooking: false, manualInterventionRequired: false };
  }
  if (mappedStatus === 'CANCELLED' && localStatus === 'CANCELLED' && (sameReference || !reference || reference === incoming)) {
    return { action: 'idempotent_cancelled', confirmBooking: false, manualInterventionRequired: false };
  }
  if (mappedStatus === 'FAILED') {
    return { action: 'mark_failed', confirmBooking: false, manualInterventionRequired: false };
  }
  if (mappedStatus === 'CANCELLED') {
    return { action: 'mark_cancelled', confirmBooking: false, manualInterventionRequired: false };
  }
  return { action: 'pending', confirmBooking: false, manualInterventionRequired: false };
}

module.exports = { classifyVerification };
