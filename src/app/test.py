import datetime

# Waktu kedaluwarsa dalam epoch time
expiry_timestamp = 1736553599

# Mengonversi ke format tanggal dan waktu
expiry_date = datetime.datetime.fromtimestamp(expiry_timestamp)

print(expiry_date)  # Output akan menunjukkan waktu kedaluwarsa dalam format yang lebih mudah dibaca
