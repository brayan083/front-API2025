// Script para probar la conectividad con el backend Spring Boot
const API_BASE_URL = 'http://localhost:4002';

async function testBackendConnection() {
  console.log('🔍 Probando conectividad con el backend...');
  console.log('URL:', API_BASE_URL);
  
  try {
    // Probar si el servidor responde
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Servidor responde:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📦 Respuesta:', data);
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    console.log('💡 Verifica que el backend esté corriendo en el puerto 4002');
  }
  
  // Probar endpoint de login
  console.log('\n🔑 Probando endpoint de login...');
  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@test.com',
        contrasena: 'test123'
      })
    });
    
    console.log('📊 Status del login:', loginResponse.status, loginResponse.statusText);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('📄 Respuesta de error:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error en login:', error.message);
  }
}

// Exportar para usar en la consola del navegador
window.testBackend = testBackendConnection;

console.log('🛠️ Herramienta de debug cargada. Ejecuta testBackend() en la consola para probar el backend.');