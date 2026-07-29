import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaUserTag,
} from "react-icons/fa";

import AuthLayout from "../components/AuthLayout";

function Register() {
  const [formData, setFormData] = useState({
    role: "",
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    console.log(formData);
    alert("Registration Successful!");
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

        <button type="submit" className="auth-btn">
          Create Account
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