## Description

This Pull Request integrates the `Laya` routing implementation while keeping its machine-learning-heavy dependencies strictly optional. This ensures that standard users of OmniRoute are not burdened with long installation times, build-time conflicts, or runtime overhead unless they actively opt-in to install the Laya router.

## Dependencies

The following packages have been moved from `dependencies` to `optionalDependencies` in `package.json`:

- `@johnhenry/backend-cpu`
- `@johnhenry/backend-webgpu`
- `@johnhenry/laya-router`

_(These dependencies are large because they bundle ONNX and MLX logic for model evaluation.)_

## Features

- **Optional Laya Router:** Users can opt-in to advanced complexity routing by explicitly installing `@johnhenry/laya-router`.
- **Graceful Fallback:** Added dynamic fallback logic in `layaRouter.ts`. If the Laya modules are missing, the router fails gracefully by falling back to standard default routing without throwing runtime errors or crashing the application.
- **Improved Build Stability:** Moving the ML modules to `optionalDependencies` significantly improves the compilation reliability with Turbopack and Webpack.
