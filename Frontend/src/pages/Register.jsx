import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaUserTag,
} from "react-icons/fa";

import AuthLayout from "../components/AuthLayout";
import { registerUser } from "../api/authApi";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    role: "",
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.role.trim() ||
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.mobile.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      alert("Please fill all required fields");
      return;
    }

    if (!emailRegex.test(formData.email)) {
      alert("Please enter a valid email address");
      return;
    }

    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        role: formData.role,
        fullName: formData.fullName,
        email: formData.email,
        mobileNumber: formData.mobile,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      alert("Registration Successful!");
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register to access the College Management System"
    >
      <form onSubmit={handleSubmit}>

        {/* Role */}
        <div className="input-group">
          <label>Role</label>

          <div className="input-box">
            <FaUserTag className="input-icon" />

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="">Select Role</option>
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="HOD">HOD</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Name */}
        <div className="input-group">
          <label>Full Name</label>

          <div className="input-box">
            <FaUser className="input-icon" />

            <input
              type="text"
              name="fullName"
              placeholder="Enter Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="input-group">
          <label>Email Address</label>

          <div className="input-box">
            <FaEnvelope className="input-icon" />

            <input
              type="email"
              name="email"
              placeholder="Enter Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Mobile */}
        <div className="input-group">
          <label>Mobile Number</label>

          <div className="input-box">
            <FaPhone className="input-icon" />

            <input
              type="tel"
              name="mobile"
              placeholder="Enter Mobile Number"
              value={formData.mobile}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="input-group">
          <label>Password</label>

          <div className="input-box">
            <FaLock className="input-icon" />

            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="input-group">
          <label>Confirm Password</label>

          <div className="input-box">
            <FaLock className="input-icon" />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Submitting..." : "Create Account"}
        </button>

        <div className="bottom-link">
          Already have an account?{" "}
          <Link to="/">Login</Link>
        </div>

      </form>
    </AuthLayout>
  );
}

export default Register;
