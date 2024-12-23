document.addEventListener('DOMContentLoaded', () => {
    toggleUIVisibility();
});


const toggleUIVisibility = () => {
    document.querySelector('#main').style.display = 'block';
    document.querySelector('.loader').style.display = 'none';
}

// TODO: On each each sections is visible add new deeplink in the navigation bar