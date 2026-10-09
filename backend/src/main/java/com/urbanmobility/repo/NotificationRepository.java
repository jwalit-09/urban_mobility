package com.urbanmobility.repo;
import com.urbanmobility.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
public interface NotificationRepository extends JpaRepository<Notification,Long>{}
