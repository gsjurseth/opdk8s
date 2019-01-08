package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"log"
	"net/http"
	"os/exec"
	"strings"
)

const message = `{"statusCode": 200, "msg": "Keeper alive and ready!"}`

type messageTPL struct {
	StatusCode int    `json:"statusCode"`
	Msg        string `json:"message"`
}

func printCommand(cmd *exec.Cmd) {
	fmt.Printf("==> Executing: %s\n", strings.Join(cmd.Args, " "))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	message := messageTPL{
		StatusCode: 200,
		Msg:        "Howdy! I'm the zookeeper Keeper",
	}

	//message.msg = "Howdy! I'm the zookeeper Keeper."
	fmt.Printf("==> Printing: ", message.StatusCode)
	json.NewEncoder(w).Encode(message)
}

func zkHandler(w http.ResponseWriter, r *http.Request) {
	print("here i am")
	out, err := exec.Command("sh", "-c", "(/opt/apigee/apigee-service/bin/apigee-service apigee-zookeeper restart ; exit 0 )").Output()
	if err != nil {
		log.Fatal("we failed and shit: ", err)
	}
	fmt.Printf("The output: %s\n", out)
	message := messageTPL{
		StatusCode: 200,
		Msg:        string(out),
	}
	json.NewEncoder(w).Encode(message)
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", homeHandler)
	r.HandleFunc("/zk", zkHandler).Methods("POST")

	// The path "/" matches everything not matched by some other path.
	http.Handle("/", r)

	srv := &http.Server{
		Addr:    "0.0.0.0:9999",
		Handler: r, // Pass our instance of gorilla/mux in.
	}

	log.Fatal(srv.ListenAndServe())
}
