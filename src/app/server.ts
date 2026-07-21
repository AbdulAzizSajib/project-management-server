import http from "http";
import app from "./app";
import { envVars } from "./config/env";
import { initSocket } from "./socket/socket";
import { seedSuperAdmin } from "./utils/seed";

const bootstrap = async () => {
    try {
        await seedSuperAdmin();

        // Socket.IO er jonno express app ke http server e wrap kori.
        // (app.listen sorasori korle io attach kora jeto na)
        const server = http.createServer(app);
        initSocket(server);

        server.listen(envVars.PORT, () => {
            console.log(`Server is running on http://localhost:${envVars.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
};

bootstrap();
