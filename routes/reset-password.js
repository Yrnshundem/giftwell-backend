router.post("/reset-password", async (req, res) => {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
        return res.status(400).json({ message: "Token, email, and new password are required" });
    }
    try {
        const resetToken = await PasswordResetToken.findOne({ token });
        if (!resetToken || resetToken.expires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }
        const user = await User.findOne({ email, _id: resetToken.userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.password = newPassword; // Password will be hashed by the pre-save hook
        await user.save();
        await PasswordResetToken.deleteOne({ token });
        res.json({ message: "Password reset successful. Please log in with your new password." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Error resetting password" });
    }
});
