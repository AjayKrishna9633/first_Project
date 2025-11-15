 const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');
    const eyeIcon1 = document.getElementById('eyeIcon1');

    togglePassword.addEventListener('click', () => {
      const isPassword = password.getAttribute('type') === 'password';
      password.setAttribute('type', isPassword ? 'text' : 'password');
      eyeIcon1.classList.toggle('bi-eye');
      eyeIcon1.classList.toggle('bi-eye-slash');
    });

 
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const eyeIcon2 = document.getElementById('eyeIcon2');

    toggleConfirmPassword.addEventListener('click', () => {
      const isPassword = confirmPassword.getAttribute('type') === 'password';
      confirmPassword.setAttribute('type', isPassword ? 'text' : 'password');
      eyeIcon2.classList.toggle('bi-eye');
      eyeIcon2.classList.toggle('bi-eye-slash');
    });