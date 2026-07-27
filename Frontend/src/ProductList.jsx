import { useCallback, useEffect, useMemo, useState } from "react";
import "./ProductList.css";

const products = [
  { id: 1, name: "Aurora Laptop", category: "Electronics", price: 1299, stock: 24, rating: 4.8, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80" },
  { id: 2, name: "Studio Headphones", category: "Audio", price: 249, stock: 42, rating: 4.6, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80" },
  { id: 3, name: "Orbit Smartwatch", category: "Wearables", price: 189, stock: 17, rating: 4.4, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80" },
  { id: 4, name: "Cloud Keyboard", category: "Accessories", price: 119, stock: 31, rating: 4.7, image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80" },
  { id: 5, name: "Field Camera", category: "Photography", price: 899, stock: 9, rating: 4.9, image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80" },
  { id: 6, name: "Arc Desk Lamp", category: "Home Office", price: 86, stock: 56, rating: 4.3, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80" },
  { id: 7, name: "Travel Pack", category: "Lifestyle", price: 145, stock: 28, rating: 4.5, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80" },
  { id: 8, name: "Pixel Monitor", category: "Electronics", price: 429, stock: 13, rating: 4.8, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80" },
  { id: 9, name: "Mono Speaker", category: "Audio", price: 159, stock: 36, rating: 4.2, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80" },
  { id: 10, name: "Daily Notebook", category: "Stationery", price: 24, stock: 84, rating: 4.6, image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80" },
];

const pageSize = 6;

function ProductList() {
  const [loadedProducts, setLoadedProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadedProducts(products);
      setIsLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(loadedProducts.map((product) => product.category))],
    [loadedProducts],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = loadedProducts.filter((product) => {
      const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(query);
      return matchesSearch && (category === "All" || product.category === category);
    });

    return [...result].sort((first, second) => {
      if (sort === "price-low") return first.price - second.price;
      if (sort === "price-high") return second.price - first.price;
      if (sort === "rating") return second.rating - first.rating;
      return first.id - second.id;
    });
  }, [category, loadedProducts, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [currentPage, filteredProducts]);

  const handleSearch = useCallback((event) => {
    setSearch(event.target.value);
    setPage(1);
  }, []);

  const handleCategory = useCallback((event) => {
    setCategory(event.target.value);
    setPage(1);
  }, []);

  const handleSort = useCallback((event) => {
    setSort(event.target.value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage);
  }, []);

  return (
    <main className="product-page">
      <header className="product-hero">
        <div>
          <p className="eyebrow">THE EDITED SHELF / 2026</p>
          <h1>Products with a point of view.</h1>
          <p className="hero-copy">A considered collection of tools for making, moving, and living well.</p>
        </div>
        <div className="hero-mark" aria-hidden="true">PL</div>
      </header>

      <section className="catalog" aria-label="Product catalog">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">CATALOG</p>
            <h2>Find your next favorite.</h2>
          </div>
          <span className="result-count">{filteredProducts.length} results</span>
        </div>

        <div className="product-controls">
          <label className="search-field">
            <span>Search</span>
            <input value={search} onChange={handleSearch} placeholder="Try “camera” or “audio”" />
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={handleCategory}>
              {categories.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Sort by</span>
            <select value={sort} onChange={handleSort}>
              <option value="featured">Featured</option>
              <option value="rating">Top rated</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="loading-state" role="status"><span className="spinner" /> Loading the collection...</div>
        ) : visibleProducts.length ? (
          <>
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image-wrap"><img src={product.image} alt={product.name} /><span>{product.category}</span></div>
                  <div className="product-info">
                    <div className="product-title-row"><h3>{product.name}</h3><strong>${product.price}</strong></div>
                    <div className="product-meta"><span>★ {product.rating}</span><span>{product.stock} in stock</span></div>
                  </div>
                </article>
              ))}
            </div>
            <nav className="pagination" aria-label="Product pages">
              <button type="button" onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>←</button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button type="button" className={currentPage === pageNumber ? "active" : ""} onClick={() => handlePageChange(pageNumber)} key={pageNumber}>{pageNumber}</button>
              ))}
              <button type="button" onClick={() => handlePageChange(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount}>→</button>
            </nav>
          </>
        ) : <div className="empty-state">No products match your search. Try another phrase.</div>}
      </section>
    </main>
  );
}

export default ProductList;
