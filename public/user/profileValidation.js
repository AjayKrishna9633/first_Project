document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profilePage");
  const nameInput = document.getElementById("name");
  const numberInput = document.getElementById("number");
  const errorName = document.getElementById('errorName');
  const errorNumber = document.getElementById('errorNumber');

  if (!form || !nameInput || !numberInput) {
    console.error("Form elements not found");
    return;
  }

  // Helper function to show error
  function showError(errorElement, message) {
    if (errorElement) {
      errorElement.classList.remove('hidden');
      errorElement.querySelector('span').textContent = message;
    }
  }

  // Helper function to hide error
  function hideError(errorElement) {
    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.querySelector('span').textContent = '';
    }
  }

  nameInput.addEventListener('input', () => hideError(errorName));
  numberInput.addEventListener('input', () => hideError(errorNumber));

  
  form.addEventListener("submit", (e) => {
    const name = nameInput.value.trim();
    const number = numberInput.value.trim();
    let isValid = true;

    // Clear all errors
    hideError(errorName);
    hideError(errorNumber);

if(!name){
    isValid=false;
    showError(errorName,`Name shouldn't be empty`)
}else{
    if(name.length < 3){
        isValid=false;
        showError(errorName,`Name should contain more than 3 letters`)
    }
}
if(!number){
    isValid = false;
    showError(errorNumber, `Phone number is required`)
} else if(!/^\d+$/.test(number)){
    isValid = false;
    showError(errorNumber, `Phone number should contain only digits`)
} else if(number.length !== 10){
    isValid = false;
    showError(errorNumber, `Phone number must be exactly 10 digits`)
}


    // Prevent submission if invalid
    if (!isValid) {
      e.preventDefault();
    }
  });
});

