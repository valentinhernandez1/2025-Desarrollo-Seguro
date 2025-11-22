# test_invoices_sql_injection.py
import requests

BASE = "http://localhost:5000"

def test_sql_injection_in_invoices():
    # --- 1) LOGIN DIRECTO CON EL USUARIO REAL DE TU BASE ---
    login = requests.post(
        f"{BASE}/auth/login",
        json={"username": "valen", "password": "123456"}
    )

    assert login.status_code == 200, f"Login falló: {login.text}"
    token = login.json().get("token")
    assert token, "No se obtuvo token"

    # --- 2) Intento de SQL Injection ---
    payload = {
        "status": "unpaid' OR 1=1--"
    }

    r = requests.get(
        f"{BASE}/invoices",
        headers={"Authorization": f"Bearer {token}"},
        params=payload
    )

    # --- 3) Validaciones ---
    assert r.status_code != 500, "El endpoint explotó → SQL Injection posible"

    assert r.status_code in [400, 422], (
        f"El endpoint aceptó un parámetro vulnerable. "
        f"Status: {r.status_code}. Respuesta: {r.text}"
    )
