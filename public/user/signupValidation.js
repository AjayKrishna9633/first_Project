document.addEventListener("DOMContentLoaded", () => {
  console.log("register validation is loaded");
  const form = document.getElementById("signup");

  document.getElementById("fullName").addEventListener("input", () => {
    clearError('error1');
  })
    document.getElementById('email').addEventListener('input',()=>{
      clearError('error2')
    })
    document.getElementById('password').addEventListener('input',()=>{
      clearError('error3')
    })
    document.getElementById('confirmPassword').addEventListener('input',()=>{
      clearError('error4')
    })
    function clearError(errorId){
      const errorElement = document.getElementById(errorId);
      errorElement.style.display="none";
      errorElement.innerHTML="";
       
    }


    function clearAllError(){
      clearError('error1');
      clearError('error2');
      clearError('error3');
      clearError('error4');
    }




  form.addEventListener("submit", (e) => {
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document
      .getElementById("confirmPassword")
      .value.trim();
    const error1 =document.getElementById('error1');
    const error2 =document.getElementById('error2');
    const error3 =document.getElementById('error3');
    const error4 =document.getElementById('error4');

clearAllError();
    
    let valid = true;
    if (!fullName) {
      valid = false;
      
      error1.style.display="block";
      error1.innerHTML = "Please enter your full name";
    } else if (fullName.length < 3) {
      valid = false;
      
      error1.style.display="block"
      error1.innerHTML = "Full name must be at least 3 characters long.";
    } else if (!/^[a-zA-z]/.test(fullName)) {
      valid = false;
      
      error1.style.display="block"
      error1.innerHTML = "The name must start with a letter.";
    }
    if (!email) {
      valid = false;
      
      error2.style.display="block"
       error2.innerHTML = "please enter your e-mail";
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        valid = false;
        
        error2.style.display="block"
         error2.innerHTML = "Please enter a valid e-mail";
      }
    }
    if (!password) {
      valid = false;
      
      error3.style.display='block'
        error3.innerHTML = "Please enter your password";
    } else if (password.length < 8) {
      valid = false;
      
      error3.style.display='block'
        error3.innerHTML = "The password should be 8 charater long";
    } else if(password[0]!==password[0].toUpperCase()){
              valid=false;
              console.log("the error triggered");
              error3.innerHTML = "The first letter must be uppercase";
          
        } else if (passwordRegex.test(password)){
          console.log("it is working the password regex");
          valid = false;
          errorPassword.innerHTML='The password must contain a number'
          }

    if (!confirmPassword) {
      valid = false;
      
      error4.style.display='block'
      error4.innerHTML =
        "Please confirm your passsword by entering it again";
    } else if (confirmPassword !== password) {
      valid = false;
      
      error4.style.display='block'
      error4.innerHTML = "The password and confirm password do not match";
    }

    if (!valid) {
      e.preventDefault();
    }
    console.log(
      `errors:${errorEmail + errorConfirmPassword + errorName + errorPassword}`
    );
  });
});
