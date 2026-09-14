# test_motor.py
import sys
import os

# Asegurar que Python reconozca la carpeta 'app' como módulo
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.motor_analisis import MotorAnalisisPython

if __name__ == "__main__":
    # Vamos a analizar el propio código de la plataforma SoftQuality como prueba
    ruta_a_analizar = "./app" 
    
    print(f"Iniciando análisis estático en: {ruta_a_analizar}\n")
    
    motor = MotorAnalisisPython(ruta_a_analizar)
    resultados = motor.analizar_proyecto()
    
    if not resultados:
        print("No se encontraron métricas o archivos .py")
    else:
        for resultado in resultados:
            print(f"- {resultado.nombre_metrica}: {resultado.valor} {resultado.unidad}")
            print(f"  ISO 25010: {resultado.caracteristica_iso_sugerida}\n")