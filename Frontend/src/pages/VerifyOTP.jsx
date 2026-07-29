import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function VerifyOTP() {

  const navigate = useNavigate();

  const [otp, setOtp] = useState("");

  const handleSubmit = (e) => {

    e.preventDefault();

    if (otp.length !== 6) {
      alert("Enter a valid 6-digit OTP");
      return;
    }

    alert("OTP Verified Successfully!");

    navigate("/reset-password");

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

        <button className="auth-btn">
          Verify OTP
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