import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ProductApp from "./ProductApp";
import "./styles.css";
import "./product.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ProductApp />
  </StrictMode>,
);
