import { Request, Response, NextFunction } from "express";

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Check whether user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      // 2. Check user role
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource",
        });
      }

      // 3. Allow access
      next();

    } catch (error) {
      console.error("Authorization Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};