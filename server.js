require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// =============================
// TEST ROUTE
// =============================
app.get("/test", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");

  if (error) return res.status(500).json(error);
  res.json(data);
});

// =============================
// WEBHOOK HOTMART
// =============================
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body.event;
    const payload = req.body.data;

    console.log("Evento recibido:", event);

    if (!payload || !payload.buyer) {
      console.log("Payload inválido");
      return res.sendStatus(200);
    }

    const email = payload.buyer.email;

    // =============================
    // PURCHASE APPROVED
    // =============================
    if (event === "PURCHASE_APPROVED") {

      const product_id = payload.product?.id || null;
      const plan_name = payload.subscription?.plan?.name || null;
      const subscription_code =
        payload.subscription?.subscriber?.code || null;
      const transaction =
        payload.purchase?.transaction || null;

      // Convertir fecha next_charge a Date
      let expires_at = null;
      if (payload.purchase?.date_next_charge) {
        expires_at = new Date(
          payload.purchase.date_next_charge
        );
      }

      // Diferenciar trial vs plan real
      let status = "active";
      if (plan_name && plan_name.toLowerCase().includes("prueba")) {
        status = "trial";
      }

      const { error } = await supabase
        .from("users")
        .upsert(
          {
            email,
            product_id,
            plan_name,
            subscription_code,
            hotmart_transaction: transaction,
            status,
            expires_at,
            updated_at: new Date()
          },
          { onConflict: "email" }
        );

      if (error) {
        console.log("Error guardando:", error);
        return res.status(500).json(error);
      }

      console.log("Usuario activado:", email, "| Plan:", plan_name);
    }

    // =============================
    // CANCELACIONES Y REEMBOLSOS
    // =============================
    if (
      event === "PURCHASE_CANCELED" ||
      event === "SUBSCRIPTION_CANCELLATION" ||
      event === "PURCHASE_REFUNDED"
    ) {
      const { error } = await supabase
        .from("users")
        .update({
          status: "canceled",
          updated_at: new Date()
        })
        .eq("email", email);

      if (error) {
        console.log("Error cancelando:", error);
        return res.status(500).json(error);
      }

      console.log("Usuario cancelado:", email);
    }

    res.sendStatus(200);

  } catch (err) {
    console.log("Error webhook:", err);
    res.sendStatus(500);
  }
});

// =============================
// START SERVER
// =============================
app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});
