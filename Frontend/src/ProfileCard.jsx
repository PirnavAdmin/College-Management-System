import React from "react";

function ProfileCard(props) {
  return (
    <div style={styles.card}>
      <img src={props.image} alt={props.name} style={styles.image} />

      <h2>{name}</h2>

      <p>
        <strong>Role:</strong> {props.role}
      </p>

      <p>
        <strong>Company:</strong> {props.company}
      </p>

      <button style={styles.button}>View Profile</button>
    </div>
  );
}

const styles = {
  card: {
    width: "300px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "center",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    margin: "20px auto"
  },

  image: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover"
  },

  button: {
    marginTop: "15px",
    padding: "10px 20px",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  }
};

export default ProfileCard;