import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function ResetPassword() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    password:"",
    confirmPassword:"",
  });

  const handleChange=(e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value,
    });

  };

  const handleSubmit=(e)=>{

    e.preventDefault();

    if(form.password!==form.confirmPassword){

      alert("Passwords do not match");
      return;

    }

    alert("Password Reset Successfully");

    navigate("/login");

  };

  return(

    <AuthLayout
      title="Reset Password"
      subtitle="Create your new password"
    >

      <form onSubmit={handleSubmit}>

        <div className="input-group">

          <label>New Password</label>

          <div className="input-box">

            <input
              type="password"
              name="password"
              placeholder="Enter New Password"
              value={form.password}
              onChange={handleChange}
              required
            />

          </div>

        </div>

        <div className="input-group">

          <label>Confirm Password</label>

          <div className="input-box">

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />

          </div>

        </div>

        <button
          className="auth-btn"
          type="submit"
        >
          Reset Password
        </button>

      </form>

    </AuthLayout>

  );

}

export default ResetPassword;