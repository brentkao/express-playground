import { z } from "zod";
import { formatZodValidationErrors } from "../app/util/zod";

const input = {
  email: "test@gmail.com",
  password: "1234",
};
const wrongInput = {
  email: "test@.com",
  password: "",
};
function parse(input: any) {
  console.log("\n= = = = =\n");
  const { email, password } = z
    .object({
      email: z.string().email("Invalid email").min(1, "Email is required"),
      password: z.string().min(1, "Password is required"),
    })
    .parse(input);

  console.log("Zod parse", email, password);
}

function safeParse(input: any) {
  console.log("\n= = = = =\n");
  const result = z
    .object({
      email: z.string().email("Invalid email").min(1, "Email is required"),
      password: z.string().min(1, "Password is required"),
    })
    .safeParse(input);

  console.log("Zod safeParse result: ", result);
  if (!result.success)
    return console.log(
      "Zob safeParse error: ",
      formatZodValidationErrors(result.error)
    );
  const { email, password } = result.data;
  console.log("Zod safeParse", email, password);
}

// parse(input);
// parse(wrongInput);

// safeParse(input);
// safeParse(wrongInput);
