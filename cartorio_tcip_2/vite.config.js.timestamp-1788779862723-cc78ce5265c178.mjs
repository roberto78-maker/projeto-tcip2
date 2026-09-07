// vite.config.js
import { defineConfig } from "file:///C:/Projetos/TCIP/cartorio_tcip_2/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Projetos/TCIP/cartorio_tcip_2/node_modules/@vitejs/plugin-react/dist/index.js";
var DJANGO_URL = process.env.VITE_DJANGO_URL || "http://localhost:8000";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    host: true,
    // expõe na rede local (acesso por celular/tablet via IP)
    allowedHosts: true,
    // aceita qualquer hostname (ngrok, IP de rede, etc.)
    proxy: {
      // Redireciona /api/* → Django (transparente, sem CORS)
      "/api": {
        target: DJANGO_URL,
        changeOrigin: true,
        secure: false
      },
      // Redireciona /media/* → Django (arquivos de upload)
      "/media": {
        target: DJANGO_URL,
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxQcm9qZXRvc1xcXFxUQ0lQXFxcXGNhcnRvcmlvX3RjaXBfMlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcUHJvamV0b3NcXFxcVENJUFxcXFxjYXJ0b3Jpb190Y2lwXzJcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1Byb2pldG9zL1RDSVAvY2FydG9yaW9fdGNpcF8yL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5cclxuLy8gVVJMIGRvIERqYW5nbyBcdTIwMTQgcG9kZSBzZXIgc29icmVzY3JpdGEgcG9yIFZJVEVfREpBTkdPX1VSTCBubyAuZW52LmxvY2FsXHJcbi8vIChcdTAwRkF0aWwgcXVhbmRvIG8gRGphbmdvIHJvZGEgZW0gb3V0cmEgbVx1MDBFMXF1aW5hIG91IHBvcnRhIGRpZmVyZW50ZSlcclxuY29uc3QgREpBTkdPX1VSTCA9IHByb2Nlc3MuZW52LlZJVEVfREpBTkdPX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBiYXNlOiAnLycsXHJcbiAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogdHJ1ZSwgICAgICAgICAgLy8gZXhwXHUwMEY1ZSBuYSByZWRlIGxvY2FsIChhY2Vzc28gcG9yIGNlbHVsYXIvdGFibGV0IHZpYSBJUClcclxuICAgIGFsbG93ZWRIb3N0czogdHJ1ZSwgIC8vIGFjZWl0YSBxdWFscXVlciBob3N0bmFtZSAobmdyb2ssIElQIGRlIHJlZGUsIGV0Yy4pXHJcbiAgICBwcm94eToge1xyXG4gICAgICAvLyBSZWRpcmVjaW9uYSAvYXBpLyogXHUyMTkyIERqYW5nbyAodHJhbnNwYXJlbnRlLCBzZW0gQ09SUylcclxuICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBESkFOR09fVVJMLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgICAvLyBSZWRpcmVjaW9uYSAvbWVkaWEvKiBcdTIxOTIgRGphbmdvIChhcnF1aXZvcyBkZSB1cGxvYWQpXHJcbiAgICAgICcvbWVkaWEnOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBESkFOR09fVVJMLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHByZXZpZXc6IHtcclxuICAgIGhvc3Q6IHRydWUsXHJcbiAgICBwb3J0OiA0MTczLFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgIGFsbG93ZWRIb3N0czogdHJ1ZSxcclxuICB9LFxyXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFIsU0FBUyxvQkFBb0I7QUFDdlQsT0FBTyxXQUFXO0FBSWxCLElBQU0sYUFBYSxRQUFRLElBQUksbUJBQW1CO0FBRWxELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUNOLGNBQWM7QUFBQTtBQUFBLElBQ2QsT0FBTztBQUFBO0FBQUEsTUFFTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBO0FBQUEsTUFFQSxVQUFVO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsRUFDaEI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
