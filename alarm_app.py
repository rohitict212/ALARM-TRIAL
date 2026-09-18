import time
import tkinter as tk
from tkinter import messagebox

class AlarmApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Alarm App")
        self.root.geometry("300x150")
        
        self.label = tk.Label(self.root, text="", font=('Helvetica', 14))
        self.label.pack(expand=True)
        
        self.button = tk.Button(self.root, text="Stop Alarm", command=self.stop_alarm)
        self.button.pack(expand=True)
        
        self.alarm_time = time.time() + 10
        self.is_active = True
        self.update_time()
        
    def update_time(self):
        if self.is_active:
            current_time = time.time()
            remaining = self.alarm_time - current_time
            
            if remaining <= 0:
                self.label.config(text="?? Alarm is going off!")
                self.button.config(text="Stop Alarm", command=self.stop_alarm)
            else:
                self.label.config(text=f"Alarm will go off in {int(remaining) + 1} seconds")
                self.button.config(text="Cancel Alarm", command=self.stop_alarm)
        
        self.root.after(1000, self.update_time)

    def stop_alarm(self):
        self.is_active = False
        self.label.config(text="Alarm stopped/cancelled")
        self.button.config(text="Start Alarm", command=self.start_alarm)

    def start_alarm(self):
        self.alarm_time = time.time() + 10
        self.is_active = True
        self.label.config(text="Alarm set for 10 seconds")
        self.button.config(text="Stop Alarm", command=self.stop_alarm)

if __name__ == "__main__":
    app = AlarmApp()
    app.root.mainloop()
