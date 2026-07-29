import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { verifyOtp } from "../api/authApi";

function VerifyOTP() {

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!email) {
      alert("Email is missing. Please request OTP again.");
      navigate("/forgot-password");
      return;
    }

    if (!otp.trim()) {
      alert("Please enter OTP");
      return;
    }

    if (otp.length !== 6) {
      alert("Enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const response = await verifyOtp({
        email,
        otp,
      });

      alert(response.data?.message || "OTP Verified Successfully!");
      navigate("/reset-password", {
        state: {
          email,
          otp,
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
      title="Verify OTP"
      subtitle="Enter the 6-digit verification code"
    >

      <form onSubmit={handleSubmit}>

        <div className="input-group">

          <label>OTP</label>

          <div className="input-box">

            <input
              type="text"
              maxLength={6}
              placeholder="Enter OTP"
              value={otp}
              onChange={(e)=>
                setOtp(e.target.value.replace(/\D/g,""))
              }
              required
            />

          </div>

        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="bottom-link">
          Didn't receive OTP?{" "}
          <Link to="/forgot-password">
            Resend OTP
          </Link>
        </div>

      </form>

    </AuthLayout>

  );
}

export default VerifyOTP;
