import createApi from "./createApi";

const app = createApi();
const port = 5000;

app.listen(port, () => {
  console.log(`server is on ${port}`);
});
