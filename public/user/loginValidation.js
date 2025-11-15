document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginPage");
  form.addEventListener("submit", (e) => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    let isvalid = true;
    let errorEmail = "";
    let errorPassword = "";
    let passwordRegex=/[0-9]/;
    if (!email) {
      isvalid = false;
      errorEmail = "Please enter your E-mail";
    } else {
      const emailRegex = /^[a-zA-Z0-9_+]+@[a-z0-9.-]+\.[a-z]{2,}$/;
      if (!emailRegex.test(email)) {
        isvalid = false;
        errorEmail = "Please enter a valid E-mail";
      }
    }
    if (!password) {
      isvalid = false;
      errorPassword = "Please Enter your password";
    } else if (password.length < 8) {
      isvalid = false;
      errorPassword = "Password must be 8 or more characters";
    } else if(password[0]!==password[0].toUpperCase()){
              valid=false;
              console.log("the error triggered");
              errorPassword.innerHTML = "The first letter must be uppercase";
          
        } else if (passwordRegex.test(password)){
          console.log("it is working the password regex");
          valid = false;
          errorPassword.innerHTML='The password must contain a number'
          }

    if (!isvalid) {
      e.preventDefault();
    }

    console.log(errorEmail + " " + errorPassword);
  });
});
