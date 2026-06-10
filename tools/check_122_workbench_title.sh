cd /home/ubuntu/ai-native-command-center-v2 || exit 1
sha256sum workbench-v2-clean.js
node --check workbench-v2-clean.js
grep -n "LK_T" workbench-v2-clean.js | head -n 3 || true
grep -n "buildCleanTitleChoices = function" workbench-v2-clean.js | head -n 3 || true
grep -n "AI 工具让人提效" workbench-v2-clean.js | head -n 3 || true
grep -n "function buildCleanTitleChoices" workbench-v2-clean.js | head -n 3 || true
grep -n "function buildPlatformTitleCandidates" workbench-v2-clean.js | head -n 3 || true
