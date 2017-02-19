package main

import (
	"fmt"
	"github.com/gorilla/mux"
	"html/template"
	"net/http"
)

type Door struct {
	Name     string
	isClosed bool
}

func (d Door) Status() string {
	if d.isClosed {
		return "Closed"
	} else {
		return "Open"
	}
}

func main() {
	tmpl := template.Must(template.ParseFiles("index.html"))

	doors := []Door{
		{"His", false},
		{"Hers", true},
	}

	r := mux.NewRouter()
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl.Execute(w, struct{ Doors []Door }{doors})
	}).Methods("GET")

	s := http.StripPrefix("/static", http.FileServer(http.Dir("./static/")))
	r.PathPrefix("/static/").Handler(s)

	fmt.Println("Listening on port 8080")
	http.ListenAndServe(":8080", r)
}
