"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Import routes
const series_1 = __importDefault(require("./routes/series"));
const volumes_1 = __importDefault(require("./routes/volumes"));
const issues_1 = __importDefault(require("./routes/issues"));
const copies_1 = __importDefault(require("./routes/copies"));
const publisher_1 = __importDefault(require("./routes/publisher"));
const locations_1 = __importDefault(require("./routes/locations"));
const storylines_1 = __importDefault(require("./routes/storylines"));
const covers_1 = __importDefault(require("./routes/covers"));
const collectedEditions_1 = __importDefault(require("./routes/collectedEditions"));
const tags_1 = __importDefault(require("./routes/tags"));
const credits_1 = __importDefault(require("./routes/credits"));
const stats_1 = __importDefault(require("./routes/stats"));
const persons_1 = __importDefault(require("./routes/persons"));
// Register routes
app.use(series_1.default);
app.use(volumes_1.default);
app.use(issues_1.default);
app.use(copies_1.default);
app.use(publisher_1.default);
app.use(locations_1.default);
app.use(storylines_1.default);
app.use(covers_1.default);
app.use(collectedEditions_1.default);
app.use(tags_1.default);
app.use(credits_1.default);
app.use(stats_1.default);
app.use(persons_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map