import psycopg2

def get_connection():
    return psycopg2.connect(
        dbname="student_warning_db",
        user="postgres",
        password="ravishalini123@@",
        host="localhost",
        port="5432"
    )
