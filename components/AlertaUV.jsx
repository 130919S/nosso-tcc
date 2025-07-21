/* 
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AlertaUV() {
  const [uvIndex, setUvIndex] = useState(null);
  const [alerta, setAlerta] = useState('');

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const response = await axios.get(
            `http://localhost:5000/uv?lat=${lat}&lon=${lon}`
          );

          const uv = response.data.uv;
          setUvIndex(uv);

          if (uv >= 8) {
            setAlerta('⚠ Atenção: índice UV atual é muito alto. Evite exposição!');
          } else if (uv >= 6) {
            setAlerta('⚠ Atenção: índice UV atual é alto. Use proteção!');
          } else {
            setAlerta('✅ Índice UV em níveis seguros no momento.');
          }
        } catch (error) {
          console.error('Erro ao buscar índice UV:', error);
          setAlerta('⚠ Não foi possível obter o índice UV.');
        }
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        setAlerta('⚠ Não foi possível obter sua localização.');
      }
    );
  }, []);

  return (
    <div style={{
      backgroundColor: '#f97316',
      color: 'white',
      padding: '10px',
      textAlign: 'center',
      fontWeight: 'bold'
    }}>
      {alerta} {uvIndex !== null && `(UV: ${uvIndex})`}
    </div>
  );
}

export default AlertaUV;
*/
