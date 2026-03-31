// Python依存パッケージのインストール確認
const { execSync } = require("child_process");

try {
  execSync("python -c \"import transformers, PIL, numpy\"", { stdio: "pipe" });
  console.log("Python dependencies OK.");
} catch {
  console.log("Installing Python dependencies...");
  try {
    execSync("pip install transformers torch pillow numpy", { stdio: "inherit" });
    console.log("Python dependencies installed.");
  } catch (e) {
    console.error("Failed to install Python dependencies. Please run manually:");
    console.error("  pip install transformers torch pillow numpy");
  }
}
