import React from "react";

function ProductCard({ image, name, price, category }) {
  return (
    <div style={styles.card}>
      <img src={image} alt={name} style={styles.image} />

      <h2>{name}</h2>

      <p>{category}</p>

      <h3>₹ {price}</h3>

      <button style={styles.button}>Add to Cart</button>
    </div>
  );
}

const styles = {
  card: {
    width: "250px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "center",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
  },

  image: {
    width: "150px",
    height: "150px",
    objectFit: "contain"
  },

  button: {
    marginTop: "10px",
    padding: "10px",
    background: "green",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  }
};

export default ProductCard;