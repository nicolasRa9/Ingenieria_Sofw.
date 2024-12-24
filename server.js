const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET_KEY = "mystic_secret_key";

// Conexión a la base de datos
const db = mysql.createConnection({
  host: "34.44.135.158",
  user: "rooot",
  password: "hola123abc", // Cambia esta configuración según tu servidor MySQL
  database: "tcg-db",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Conectado a la base de datos.");
});

app.use(cors());
app.use(bodyParser.json());

// ------------------- Usuarios -------------------

// Registro de usuario
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  const query = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  db.query(query, [name, email, hashedPassword], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).send("El correo ya está registrado.");
      }
      return res.status(500).send(err);
    }
    res.status(201).send("Usuario registrado con éxito.");
  });
});

// Inicio de sesión
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length === 0) {
      return res.status(404).send("Usuario no encontrado.");
    }

    const user = results[0];
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send("Contraseña incorrecta.");
    }

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).send({ token, user: { id: user.id, name: user.name, email: user.email } });
  });
});

// ------------------- Cartas/Productos -------------------

// Obtener todas las cartas (productos)
app.get("/products", (req, res) => {
  const query = "SELECT * FROM products";
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);

    res.status(200).send(results);
  });
});

// Agregar una nueva carta (producto)
app.post("/products", (req, res) => {
  const { name, image_url, price } = req.body;
  const query = "INSERT INTO products (name, image_url, price) VALUES (?, ?, ?)";
  db.query(query, [name, image_url, price], (err, result) => {
    if (err) return res.status(500).send(err);

    res.status(201).send("Carta añadida con éxito.");
  });
});

// Actualizar una carta existente
app.put("/products/:id", (req, res) => {
  const { id } = req.params;
  const { name, image_url, price } = req.body;
  const query = "UPDATE products SET name = ?, image_url = ?, price = ? WHERE id = ?";
  db.query(query, [name, image_url, price, id], (err, result) => {
    if (err) return res.status(500).send(err);

    res.status(200).send("Carta actualizada con éxito.");
  });
});

// Eliminar una carta
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM products WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send(err);

    res.status(200).send("Carta eliminada con éxito.");
  });
});

// ------------------- Pedidos -------------------

// Obtener historial de pedidos por usuario
app.get("/orders", (req, res) => {
  const userId = req.query.userId;

  const query = `
    SELECT o.id, o.date, o.total, GROUP_CONCAT(op.product_name, ' x', op.quantity SEPARATOR ', ') AS products
    FROM orders o
    JOIN order_products op ON o.id = op.order_id
    WHERE o.user_id = ?
    GROUP BY o.id
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).send(err);

    res.status(200).send(results);
  });
});

// Crear un nuevo pedido
app.post("/orders", (req, res) => {
  const { userId, total, products } = req.body;

  const queryOrder = "INSERT INTO orders (user_id, total) VALUES (?, ?)";
  db.query(queryOrder, [userId, total], (err, result) => {
    if (err) return res.status(500).send(err);

    const orderId = result.insertId;
    const queryProducts = "INSERT INTO order_products (order_id, product_name, quantity) VALUES ?";
    const values = products.map((p) => [orderId, p.name, p.quantity]);

    db.query(queryProducts, [values], (err) => {
      if (err) return res.status(500).send(err);

      res.status(201).send("Pedido creado con éxito.");
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
