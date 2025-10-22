const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const productRoute = require("./routes/productRoute");
const categoryRoute = require("./routes/categoryRoute");
const orderRoute = require("./routes/orderRoute");
const userRoute = require( "./routes/userRoute.js");
const mobileNumberRoute = require('./routes/mobileNumberRoute');








const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use("/api/products", productRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/orders", orderRoute);
app.use("/api/users", userRoute);
app.use("/api/mobilenumbers", mobileNumberRoute);





app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
