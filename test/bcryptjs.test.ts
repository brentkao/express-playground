import bcrypt from "bcryptjs";

async function hashPassword(password: string): Promise<string> {
  // 隨機生成鹽，saltRounds 控制鹽的複雜度
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  console.log("Salt:", salt);

  // 使用鹽對密碼進行哈希
  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
}

async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  // 將給定的密碼與哈希密碼進行比較
  //   const match = await bcrypt.compare(password, hashedPassword);
  console.log("comparePasswords");

  const match = await bcrypt.compare(
    password,
    hashedPassword,
    (err, result) => {
      console.log("err:", err);
      console.log("result:", result);
    },
    (pro) => console.log("progressCallback:", pro)
  );

  // return match;
  return false;
}

// 示例用法
async function main() {
  const plainPassword = "your_plain_password";

  // 生成哈希密碼並加鹽
  const hashedPassword = await hashPassword(plainPassword);
  console.log("Hashed Password:", hashedPassword);

  // 模擬用戶輸入的密碼
  //   const userInputPassword = 'user_input_password'; //=> false

  const userInputPassword = "your_plain_password"; //=> true

  // 比较密码
  const isMatch = await comparePasswords(userInputPassword, hashedPassword);
  //   console.log("Password Match:", isMatch);
}

main().catch(console.error);
