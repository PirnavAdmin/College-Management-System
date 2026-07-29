import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";

import AuthLayout from "../components/AuthLayout";

function Login() {

  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {

    const { name, value, checked, type } = e.target;

    setLoginData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

  };

  const handleSubmit = (e) => {

    e.preventDefault();

    console.log(loginData);

    alert("Login Successful");

    // Later this will go to Dashboard
    navigate("/dashboard");

  };

  return (

    <AuthLayout
      title="Welcome Back"
      subtitle="Login to your College Management System account"
    >

      <form onSubmit={handleSubmit}>

        {/* Email */}

        <div className="input-group">

          <label>Email Address</label>

          <div className="input-box">

            <FaEnvelope className="input-icon" />

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={loginData.email}
              onChange={handleChange}
              required
            />

          </div>

        </div>

        {/* Password */}

        <div className="input-group">

          <label>Password</label>

          <div className="input-box password-box">

            <FaLock className="input-icon" />

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={loginData.password}
              onChange={handleChange}
              required
            />

            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >

              {showPassword ? <FaEyeSlash /> : <FaEye />}

            </span>

          </div>

        </div>

        {/* Remember */}

        <div className="login-options">

          <label className="remember">

            <input
              type="checkbox"
              name="remember"
              checked={loginData.remember}
              onChange={handleChange}
            />

            Remember Me

          </label>

          <Link to="/forgot-password">

            Forgot Password?

          </Link>

        </div>

        <button
          className="auth-btn"
          type="submit"
        >

          Login

        </button>

        <div className="bottom-link">

          Don't have an account?

          <Link to="/register">

            Register

          </Link>

        </div>

      </form>

    </AuthLayout>

  );
}

export default Login;