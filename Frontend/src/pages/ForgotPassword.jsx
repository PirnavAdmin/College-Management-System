import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function ForgotPassword() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!value.trim()) {
      alert("Please enter your Email or Mobile Number");
      return;
    }

    alert("OTP Sent Successfully!");
    navigate("/verify-otp");
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your registered email or mobile number"
    >
      <form onSubmit={handleSubmit}>

        <div className="input-group">
          <label>Email / Mobile Number</label>

          <div className="input-box">
            <input
              type="text"
              placeholder="Enter Email or Mobile Number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
        </div>

        <button className="auth-btn" type="submit">
          Send OTP
        </button>

        <div className="bottom-link">
          <Link to="/login">← Back to Login</Link>
        </div>

      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;