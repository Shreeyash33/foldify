import { Router } from 'express';
import statusRoutes from './status.routes.ts';
import authRoutes from './auth.routes.ts';
import productRoutes from './products.routes.ts';
import tutorialRoutes from './tutorials.routes.ts';
import craftRoutes from './craft.routes.ts';
import orderRoutes from './orders.routes.ts';
import contactRoutes from './contact.routes.ts';
import userRoutes from './users.routes.ts';
import adminRoutes from './admin.routes.ts';

/**
 * The whole API surface, readable in one screen. Every sub-router mounts here
 * and nowhere else — if a URL is not listed below, it does not exist.
 */
const router: Router = Router();

router.use('/status', statusRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/tutorials', tutorialRoutes);
router.use('/craft-files', craftRoutes);
router.use('/orders', orderRoutes);
router.use('/contact', contactRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

export default router;
