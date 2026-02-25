require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// 🔹 Ruta para ver todos los usuarios
app.get("/test", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    console.log("Error:", error);
    return res.status(500).json(error);
  }

  res.json(data);
});

// 🔹 Ruta para insertar usuario de prueba
app.get("/insert-test", async (req, res) => {
  const { data, error } = await supabase.from("users").insert([
    {
      discord_id: "123456789",
      email: "test@email.com",
      product_id: "producto_1",
      status: "active",
      expires_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  if (error) {
    console.log("Error:", error);
    return res.status(500).json(error);
  }

  res.json({ message: "Usuario insertado", data });
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body.event;
    const payload = req.body.data;

    console.log("Evento recibido:", event);

    if (event === "PURCHASE_APPROVED") {
      const email = payload.buyer.email;
      const product_id = payload.product.id;

      const { error } = await supabase
        .from("users")
        .upsert({
          email: email,
          product_id: product_id,
          status: "active",
          updated_at: new Date()
        });

      if (error) {
        console.log("Error guardando:", error);
        return res.status(500).json(error);
      }

      console.log("Usuario activado:", email);
    }

    if (
      event === "PURCHASE_CANCELED" ||
      event === "SUBSCRIPTION_CANCELLATION" ||
      event === "REFUND"
    ) {
      const email = payload.buyer.email;

      await supabase
        .from("users")
        .update({
          status: "canceled",
          updated_at: new Date()
        })
        .eq("email", email);

      console.log("Usuario cancelado:", email);
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("Error webhook:", err);
    res.sendStatus(500);
  }
});