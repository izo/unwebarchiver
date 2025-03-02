document.addEventListener('DOMContentLoaded', e => {
	console.debug('hello');
	document.querySelectorAll('.data').forEach((item) => {
		item.textContent = atob(item.textContent.trim().replace(/\n|\r/g, ""));
	});
});
