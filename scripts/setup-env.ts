import fs from "fs";
import crypto from "crypto";

const ENV = ".env";

function ensureEnv() {
  if (!fs.existsSync(ENV)) {
    const jwt = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(ENV, `JWT_SECRET=${jwt}\nNODE_ENV=development\n`, {encoding:"utf8"});
    console.log(`[setup-env] created .env with random JWT_SECRET`);
    return;
  }
  
  const txt = fs.readFileSync(ENV, "utf8");
  if (!/^JWT_SECRET=/m.test(txt)) {
    const jwt = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(ENV, `${txt.trim()}\nJWT_SECRET=${jwt}\n`, {encoding:"utf8"});
    console.log(`[setup-env] appended JWT_SECRET`);
  } else {
    console.log(`[setup-env] .env already has JWT_SECRET`);
  }
}

ensureEnv();