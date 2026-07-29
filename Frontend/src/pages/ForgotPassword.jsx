import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { forgotPassword } from "../api/authApi";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = value.trim();

    if (!email) {
      alert("Please enter your Email");
      return;
    }

    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      const response = await forgotPassword({ email });

      alert(response.data?.message || "OTP Sent Successfully!");
      navigate("/verify-otp", {
        state: {
          email,
        },
      });
    } catch (error) {
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
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

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send OTP"}
        </button>

        <div className="bottom-link">
          <Link to="/login">← Back to Login</Link>
        </div>

      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;
