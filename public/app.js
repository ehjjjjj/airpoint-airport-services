const requestForm = document.querySelector('#request-form');
const requestMessage = document.querySelector('#request-message');
const lookupForm = document.querySelector('#lookup-form');
const lookupResult = document.querySelector('#lookup-result');

function showMessage(element, message, type = '') {
  element.textContent = message;
  element.className = `form-message ${type}`;
}

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(requestMessage, 'Отправляем заявку…');
  const form = new FormData(requestForm);
  const payload = Object.fromEntries(form.entries());
  payload.baggageCount = Number(payload.baggageCount);
  payload.flightNumber = payload.flightNumber.replace(/\s+/g, '');

  try {
    const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Не удалось отправить заявку.');
    showMessage(requestMessage, `Готово! Номер вашей заявки: ${data.requestNumber}`, 'success');
    requestForm.reset();
  } catch (error) {
    showMessage(requestMessage, error.message, 'error');
  }
});

lookupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  lookupResult.textContent = 'Ищем заявку…';
  const requestNumber = new FormData(lookupForm).get('requestNumber').trim().toUpperCase();
  try {
    const response = await fetch(`/api/requests/${encodeURIComponent(requestNumber)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Не удалось найти заявку.');
    lookupResult.innerHTML = `<div class="result-card"><b>${data.request_number}</b><span class="status">${data.status}</span><p>Рейс <strong>${data.flight_number}</strong> · ${data.service_type}</p><p>Дата вылета: <strong>${data.service_date}</strong> · Багаж: <strong>${data.baggage_count}</strong></p></div>`;
  } catch (error) {
    lookupResult.innerHTML = `<p class="error">${error.message}</p>`;
  }
});
