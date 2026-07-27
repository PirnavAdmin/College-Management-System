import React from "react";
import ProfileCard from "./ProfileCard";
import ProductCard from "./ProductCard";

function App() {
  const page = "products"; // Change to "product"

  // Profile Data
  const profiles = [
    {
      id: 1,
      name: "Nikitha",
      role: "React Developer",
      company: "ABC Technologies",
      image: "https://i.pravatar.cc/150?img=5",
    },
    {
      id: 2,
      name: "Rahul",
      role: "Frontend Developer",
      company: "Infosys",
      image: "https://i.pravatar.cc/150?img=8",
    },
    {
      id: 3,
      name: "Priya",
      role: "UI Developer",
      company: "TCS",
      image: "https://i.pravatar.cc/150?img=9",
    },
  ];

  // Product Data
  const products = [
    {
      id: 1,
      name: "Laptop",
      category: "Electronics",
      price: 55000,
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
    },
    {
      id: 2,
      name: "Wireless Mouse",
      category: "Accessories",
      price: 999,
      image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400",
    },
    {
      id: 3,
      name: "Keyboard",
      category: "Electronics",
      price: 1500,
      image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
        justifyContent: "center",
        marginTop: "20px",
      }}
    >
      {page === "profile"
        ? profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              name={profile.name}
              role={profile.role}
              company={profile.company}
              image={profile.image}
            />
          ))
        : products.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              category={product.category}
              price={product.price}
              image={product.image}
            />
          ))}
    </div>
  );
}

export default App;