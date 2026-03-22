import { registerSchema, loginSchema } from '../utils/validation';
import { z } from 'zod';
export declare const registerUser: (userData: z.infer<typeof registerSchema>) => Promise<any>;
export declare const loginUser: (loginData: z.infer<typeof loginSchema>) => Promise<{
    user: any;
    token: string;
}>;
//# sourceMappingURL=authService.d.ts.map