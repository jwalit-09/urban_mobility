package com.urbanmobility.config;

import com.urbanmobility.model.Driver;
import com.urbanmobility.model.Role;
import com.urbanmobility.model.Route;
import com.urbanmobility.model.Stop;
import com.urbanmobility.model.TrafficSeverity;
import com.urbanmobility.model.TrafficUpdate;
import com.urbanmobility.model.User;
import com.urbanmobility.model.Vehicle;

import com.urbanmobility.repo.DriverRepository;
import com.urbanmobility.repo.RouteRepository;
import com.urbanmobility.repo.TrafficRepository;
import com.urbanmobility.repo.UserRepository;
import com.urbanmobility.repo.VehicleRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seed(
            UserRepository users,
            PasswordEncoder encoder,
            DriverRepository drivers,
            VehicleRepository vehicles,
            RouteRepository routes,
            TrafficRepository traffic) {

        return args -> {

            User admin = users.findByEmail("admin@mobility.com")
                    .orElseGet(() ->
                            users.save(
                                    new User(
                                            "admin@mobility.com",
                                            encoder.encode("admin123"),
                                            Role.ADMIN
                                    )
                            )
                    );

            users.findByEmail("user@mobility.com")
                    .orElseGet(() ->
                            users.save(
                                    new User(
                                            "user@mobility.com",
                                            encoder.encode("user123"),
                                            Role.USER
                                    )
                            )
                    );

            if (routes.count() == 0) {

                Route r1 = new Route(
                        "Airport Express",
                        "Central Station",
                        "Airport",
                        18.0,
                        35
                );

                r1.getStops().add(
                        new Stop("Central Station", 1, r1)
                );

                r1.getStops().add(
                        new Stop("City Mall", 2, r1)
                );

                r1.getStops().add(
                        new Stop("Tech Park", 3, r1)
                );

                r1.getStops().add(
                        new Stop("Airport", 4, r1)
                );

                routes.save(r1);

                Route r2 = new Route(
                        "Metro Connector",
                        "Central Station",
                        "Airport",
                        21.0,
                        42
                );

                r2.getStops().add(
                        new Stop("Central Station", 1, r2)
                );

                r2.getStops().add(
                        new Stop("Lake View", 2, r2)
                );

                r2.getStops().add(
                        new Stop("Tech Park", 3, r2)
                );

                r2.getStops().add(
                        new Stop("Airport", 4, r2)
                );

                routes.save(r2);

                Driver d1 = drivers.save(
                        new Driver(
                                "Ravi Kumar",
                                "DL-TS-1001",
                                "9000000001"
                        )
                );

                Driver d2 = drivers.save(
                        new Driver(
                                "Anil Sharma",
                                "DL-TS-1002",
                                "9000000002"
                        )
                );

                vehicles.save(
                        new Vehicle(
                                "TS09AB1234",
                                "Bus",
                                50,
                                d1
                        )
                );

                vehicles.save(
                        new Vehicle(
                                "TS09CD5678",
                                "Electric Bus",
                                40,
                                d2
                        )
                );

                traffic.save(
                        new TrafficUpdate(
                                r1,
                                TrafficSeverity.HIGH,
                                12,
                                "Heavy traffic near City Mall"
                        )
                );

                traffic.save(
                        new TrafficUpdate(
                                r2,
                                TrafficSeverity.LOW,
                                2,
                                "Normal traffic"
                        )
                );
            }
        };
    }
}