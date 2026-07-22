import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import {
    changePasswordZodSchema,
    forgetPasswordZodSchema,
    loginUserZodSchema,
    registerUserZodSchema,
    resendOtpZodSchema,
    resetPasswordZodSchema,
    updateProfileZodSchema,
    verifyEmailZodSchema,
} from "./auth.validation";

const router = Router();

const ALL_ROLES = [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.USER,
];

router.post(
    "/register",
    validateRequest(registerUserZodSchema),
    AuthController.registerUser,
);
router.post(
    "/login",
    validateRequest(loginUserZodSchema),
    AuthController.loginUser,
);
router.get("/me", checkAuth(...ALL_ROLES), AuthController.getMe);
router.patch(
    "/me",
    checkAuth(...ALL_ROLES),
    validateRequest(updateProfileZodSchema),
    AuthController.updateProfile,
);
router.post("/refresh-token", AuthController.getNewToken);
router.post(
    "/change-password",
    checkAuth(...ALL_ROLES),
    validateRequest(changePasswordZodSchema),
    AuthController.changePassword,
);
router.post("/logout", checkAuth(...ALL_ROLES), AuthController.logoutUser);
router.post(
    "/deactivate",
    checkAuth(...ALL_ROLES),
    AuthController.deactivateAccount,
);
router.post(
    "/verify-email",
    validateRequest(verifyEmailZodSchema),
    AuthController.verifyEmail,
);
router.post(
    "/resend-verification-otp",
    validateRequest(resendOtpZodSchema),
    AuthController.resendVerificationOtp,
);
router.post(
    "/resend-password-reset-otp",
    validateRequest(resendOtpZodSchema),
    AuthController.resendPasswordResetOtp,
);
router.post(
    "/forget-password",
    validateRequest(forgetPasswordZodSchema),
    AuthController.forgetPassword,
);
router.post(
    "/reset-password",
    validateRequest(resetPasswordZodSchema),
    AuthController.resetPassword,
);

router.get("/login/google", AuthController.googleLogin);
router.get("/google/success", AuthController.googleLoginSuccess);
router.get("/oauth/error", AuthController.handleOAuthError);

export const AuthRoutes = router;
