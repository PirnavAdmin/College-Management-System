import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { resetPassword } from "../api/authApi";

function ResetPassword() {

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const otp = location.state?.otp;

  const [form, setForm] = useState({
    password:"",
    confirmPassword:"",
  });
  const [loading, setLoading] = useState(false);

  const handleChange=(e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value,
    });

  };

  const handleSubmit=async(e)=>{

    e.preventDefault();

    if (!email || !otp) {
      alert("Password reset details are missing. Please verify OTP again.");
      navigate("/forgot-password");
      return;
    }

    if (!form.password || !form.confirmPassword) {
      alert("Please fill all required fields");
      return;
    }

    if (form.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    if(form.password!==form.confirmPassword){

      alert("Passwords do not match");
      return;

    }

    try {
      setLoading(true);

      const response = await resetPassword({
        email,
        otp,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      alert(response.data?.message || "Password Reset Successfully");
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }

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
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

      </form>

    </AuthLayout>

  );

}

export default ResetPassword;
